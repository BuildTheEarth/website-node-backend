import {
  Table, Column, Model, IsEmail, DataType,
} from 'sequelize-typescript';

@Table
export default class User extends Model {
    @Column
    username: string

    @Column
    password: string

    @IsEmail
    @Column
    email: string

    @Column({
      type: DataType.JSON,
    })
    authorizedClients: string
}
