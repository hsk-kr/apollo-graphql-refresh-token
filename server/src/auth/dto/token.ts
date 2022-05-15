import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class CreateTokenResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}

@ObjectType()
export class RefreshTokenResponse {
  @Field()
  accessToken: string;
}
