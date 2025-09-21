import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds
    );

    // Create new user instance
    const user = this.userRepository.create({
      username: createUserDto.username,
      email: createUserDto.email,
      password: hashedPassword,
    });

    // Save to database - database errors will be handled by the global filter
    return await this.userRepository.save(user);
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(uuid: string) {
    return this.userRepository.findOneBy({ uuid });
  }

  update(uuid: string, updateUserDto: UpdateUserDto) {
    // TODO: Implement user update functionality
    console.log('Updating user', uuid, updateUserDto);
    return `This action updates a #${uuid} user`;
  }

  remove(uuid: string) {
    return `This action removes a #${uuid} user`;
  }
}
