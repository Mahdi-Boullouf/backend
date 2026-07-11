import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/prisma";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@easymakla.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123";

async function main() {
    const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
        await prisma.user.create({
            data: { email: ADMIN_EMAIL, password: hashedPassword, role: "ADMIN" },
        });
        console.log(`Created admin user: ${ADMIN_EMAIL}`);
    } else {
        console.log("Admin user already exists, skipping");
    }

    const plans = [
        { name: "Free Trial", days: 15, price: 0, isTrial: true },
        { name: "6 Months", days: 182, price: 20000 },
        { name: "12 Months", days: 365, price: 35000 },
    ];

    for (const plan of plans) {
        const existing = await prisma.subscription.findFirst({ where: { name: plan.name } });
        if (!existing) {
            await prisma.subscription.create({ data: plan });
            console.log(`Created subscription plan: ${plan.name}`);
        } else if (existing.price !== plan.price || existing.days !== plan.days) {
            await prisma.subscription.update({ where: { id: existing.id }, data: plan });
            console.log(`Updated subscription plan: ${plan.name}`);
        } else {
            console.log(`Subscription plan already up to date, skipping: ${plan.name}`);
        }
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
