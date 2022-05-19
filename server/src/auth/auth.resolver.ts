import { UseGuards } from '@nestjs/common';
import { Mutation, Query, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { CreateTokenResponse, RefreshTokenResponse } from './dto/token';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../guards/jwt-refresh-auth.guard';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => CreateTokenResponse)
  async createToken(): Promise<CreateTokenResponse> {
    return this.authService.createToken();
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => Boolean)
  async ping() {
    return true;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Mutation(() => RefreshTokenResponse)
  async refreshToken(): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken();
  }
}
