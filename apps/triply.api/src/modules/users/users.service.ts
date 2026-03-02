// apps/triply.api/src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@org.triply/database';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async getUser(userId: string): Promise<{
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    isTraveller: boolean;
    isSystemUser: boolean;
    isEmailVerified: boolean;
    createdAt: Date;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isTraveller: user.isTraveller,
      isSystemUser: user.isSystemUser,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
    };
  }
}
