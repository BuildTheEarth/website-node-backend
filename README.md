#

<div style="text-align: center;">
<img src="https://buildtheearth.net/assets/img/site-logo-animated.gif" alt="">
<h1>Build the Earth Website Backend</h1>
The backend for the BuildTheEarth.net website
</div>

# Start Developing

#### If you are using JetBrains WebStorm, look below under `Start Developing in WebStorm`

1. Clone this Repository (`git clone https://github.com/BuildTheEarth/website-node-backend.git`)
2. Install the dependencies with `yarn`
3. Compile the TS files to JS (`tsc` if not installed, run `npm install -g typescript`)
4. Start the server with `yarn start`
5. 🎉 Start Coding

📌 All settings can be made in a `.env` file. The following options are available:

| Name                    | Description                                                                                                                  | Required | Type                        |
|-------------------------|------------------------------------------------------------------------------------------------------------------------------|----------|-----------------------------|
| `WEBPORT`               | The port the server should listen on                                                                                         | Yes      | number                      |
| `LOGLEVEL`              | The loglevel, that shall be used.                                                                                            | Yes      | debug, info, warning, error |
| `SESSION_SECRET`        | A long random string                                                                                                         | Yes      | string                      |
| `DATABASE_URL`          | The database connection string. More info: https://www.prisma.io/docs/concepts/database-connectors/postgresql#connection-url | Yes      | string                      |
| `KEYCLOAK_CLIENTID`     | The ID of the keycloak client                                                                                                | Yes      | string                      |
| `KEYCLOAK_CLIENTSECRET` | The secret of the keycloak client                                                                                            | Yes      | string                      |
| `KEYCLOAK_URL`          | The endpoint of your keycloak instance                                                                                       | Yes      | string                      |
| `KEYCLOAK_REALM`        | Your keycloak realm                                                                                                          | Yes      | string                      |

# Start Developing in WebStorm

1. Clone this Repository (`git clone https://github.com/BuildTheEarth/website-node-backend.git`)
2. Install the dependencies with `yarn`
3. Open your WebStorm settings (CTRL+ALT+S)
4. Enable the following checkbox ![](https://nach.link/G2q9i)
5. Start the server with `yarn start`
   6🎉 Start Coding

📌 All settings can be made in a `.env` file. (Just copy and rename the `.example.env`)
