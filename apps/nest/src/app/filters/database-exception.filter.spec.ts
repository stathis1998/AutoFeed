import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DatabaseExceptionFilter } from './database-exception.filter';
import { QueryFailedError } from 'typeorm';
import { ArgumentsHost } from '@nestjs/common';

describe('DatabaseExceptionFilter', () => {
  let filter: DatabaseExceptionFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseExceptionFilter],
    }).compile();

    filter = module.get<DatabaseExceptionFilter>(DatabaseExceptionFilter);
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('mapDatabaseError', () => {
    let mockArgumentsHost: ArgumentsHost;
    let mockResponse: any;
    let mockRequest: any;

    beforeEach(() => {
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      mockRequest = {
        url: '/api/users',
        method: 'POST',
      };

      mockArgumentsHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as any;
    });

    it('should handle unique constraint violation (23505)', () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        new Error('duplicate key value violates unique constraint')
      );
      (error as any).code = '23505';
      (error as any).detail = 'Key (email)=(test@example.com) already exists.';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Email address is already registered',
        })
      );
    });

    it('should handle foreign key constraint violation (23503)', () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        new Error('foreign key constraint fails')
      );
      (error as any).code = '23503';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to related resource',
        })
      );
    });

    it('should handle not null constraint violation (23502)', () => {
      const error = new QueryFailedError(
        'INSERT',
        [],
        new Error('null value in column violates not-null constraint')
      );
      (error as any).code = '23502';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Required field cannot be empty',
        })
      );
    });

    it('should handle deadlock (40P01)', () => {
      const error = new QueryFailedError(
        'UPDATE',
        [],
        new Error('deadlock detected')
      );
      (error as any).code = '40P01';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database temporarily unavailable, please retry',
        })
      );
    });

    it('should handle unknown database errors', () => {
      const error = new QueryFailedError(
        'SELECT',
        [],
        new Error('some unknown error')
      );
      (error as any).code = '99999';

      filter.catch(error, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected database error occurred',
        })
      );
    });
  });
});
