import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async createToken() {
    const accessToken = await this.jwtService.signAsync({});
    const refreshToken = await this.jwtService.signAsync(
      {},
      {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRATION,
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshToken() {
    const accessToken = await this.jwtService.signAsync({});
    return { accessToken };
  }
}
