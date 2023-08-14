import {PrismaClient} from '@prisma/client'

let mysql = require("mysql");
const prisma = new PrismaClient();

async function main() {
  //   const user = await prisma.user.create({
  //     data: {
  //       ssoId: "a1c8d45a-ab11-46e9-abf9-95a583a1fc11",
  //       permissions: { create: { permission: "account.info" } },
  //     },
  //   });

  const connection = mysql.createConnection({
    host: "",
    user: "",
    password: "",
    port: 3306,
    database: "",
  });

  connection.connect(function (err) {
    if (err) {
      return console.error("error: " + err.message);
    }
    console.log("Connected to the MySQL server.");

    connection.query("SELECT * FROM `build_team`", (err, res) => {
      if (err) throw err;
      res.forEach(async (element) => {
        const bt = await prisma.buildTeam.create({
          data: {
            name: element.name,
            icon: `https://buildtheearth.net/uploads/${element.logo_filename}`,
            backgroundImage: `https://buildtheearth.net/uploads/${element.banner_filename}`,
            invite: element.discord_server_url,
            about: element.bio,
            creator: {
              connect: { ssoId: "a1c8d45a-ab11-46e9-abf9-95a583a1fc11" },
            },
            location: element.slug || "",
            slug: element.slug,
            socials: {
              createMany: {
                data: [
                  {
                    name: "Instagram",
                    url: "https://www.instagram.com/" + element.instagram,
                    icon: "instagram",
                  },
                  {
                    name: "Facebook",
                    url: "https://www.facebook.com/" + element.facebook,
                    icon: "facebook",
                  },
                  {
                    name: "Youtube",
                    url: element.youtube + "/",
                    icon: "youtube",
                  },
                  {
                    name: "Website",
                    url: element.website + "/",
                    icon: "website",
                  },
                  {
                    name: "Twitter",
                    url: "https://twitter.com/" + element.twitter,
                    icon: "youtube",
                  },
                ],
              },
            },
          },
        });
        console.log(bt.name);
      });
    });
  });

  //   for (let i = 0; i <= 20; i++) {
  //     await prisma.buildTeam.create({
  //       data: {
  //         name: "BuildTeam " + i,
  //         slug: "bt-" + i,
  //         creator: {
  //           connect: {
  //             id: user.id,
  //           },
  //         },
  //         members: {
  //           connect: {
  //             id: user.id,
  //           },
  //         },
  //         location: "Random Location " + i,
  //         icon: "https://cdn.streamp.live/static/76bb9f20-812c-46f1-9eea-1d23e64666d7.gif",
  //         invite: "https://buildthe.earth/de",
  //         about: "We build the earth",
  //         backgroundImage:
  //           "https://cdn.streamp.live/static/76bb9f20-812c-46f1-9eea-1d23e64666d7.gif",
  //         socials: {
  //           create: {
  //             name: "Discord" + i,
  //             icon: "discord",
  //             url: "https://discord.gg/buildtheearth",
  //           },
  //         },
  //         applicationQuestions: {
  //           create: {
  //             title: "How are you?",
  //             subtitle: "Honestly",
  //             placeholder: "Great",
  //             required: true,
  //             type: "SHORT_INPUT",
  //             icon: "question",
  //             sort: 0,
  //           },
  //         },
  //       },
  //     });
  //     await prisma.fAQQuestion.create({
  //       data: { question: "Question " + i, answer: "Answer " + i },
  //     });

  //     if (i <= 6) {
  //       await prisma.contact.create({
  //         data: {
  //           name: "Contact " + i,
  //           email: `contact${i}@buildtheearth.net`,
  //           role: "Owner",
  //         },
  //       });
  //     }
  //   }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
