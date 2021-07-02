import {
  BelongsTo, Column, DataType, ForeignKey, Model, Table,
} from 'sequelize-typescript';
import AuthClient from './AuthClient';
import User from './User';

@Table
export default class AuthCode extends Model {
    @Column
    authorizationToken: string

    @ForeignKey(() => AuthClient)
    @Column
    authClientId: string

    @ForeignKey(() => User)
    @Column
    userId: number

    @Column
    scopes: string

    @Column({ type: DataType.DATE })
    expiresAt: string

    @BelongsTo(() => AuthClient)
    authClient: AuthClient

    @BelongsTo(() => User)
    user: User
}
