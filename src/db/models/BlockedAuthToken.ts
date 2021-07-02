import {
  BelongsTo,
  Column, ForeignKey,
  Model, Table,
} from 'sequelize-typescript';
import AuthClient from './AuthClient';
import User from './User';

@Table
export default class BlockedAuthToken extends Model {
    @Column
    authToken: string

    @Column
    refreshToken: string

    @Column
    scopes: string

    @ForeignKey(() => AuthClient)
    @Column
    authClientId: string

    @ForeignKey(() => User)
    @Column
    userId: number

    @BelongsTo(() => AuthClient)
    authClient: AuthClient

    @BelongsTo(() => User)
    user: User
}
