echo "Waiting for the db to be fired up"
sleep 5
echo "Pushing schema to database"
npx prisma db push
