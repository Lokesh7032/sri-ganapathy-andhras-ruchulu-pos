const { PrismaClient } = require("@prisma/client");

async function main() {

    const prisma = new PrismaClient();

    try {

        await prisma.$connect();

        const result = await prisma.$queryRaw`
            SELECT
                current_database() AS database,
                current_user AS username
        `;

        console.log(JSON.stringify(result));

    } finally {

        await prisma.$disconnect();
    }
}

main().catch(error => {

    console.error(error);
    process.exit(1);
});
