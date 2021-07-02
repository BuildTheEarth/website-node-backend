import {
  Column, IsUrl, Model, PrimaryKey, Table,
} from 'sequelize-typescript';

@Table
export default class AuthClient extends Model {
    @PrimaryKey
    @Column
    clientID: String

    @Column
    clientSecret: String

    @Column
    name: String

    @Column
    needsConsent: Boolean

    @IsUrl
    @Column
    redirectURI: String
    // TODO: Add user owning this client -> after User model is completed
}
