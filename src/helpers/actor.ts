import { prisma } from "../prisma";

// Resolves the restaurant a given user acts on behalf of: their own (OWNER) or their employer's (CHEF/PAYMENTAGENT).
export async function resolveRestaurantForActor(userId: string, role: string) {
    if (role === "OWNER") {
        return prisma.restaurant.findUnique({ where: { memeberId: userId } });
    }
    if (role === "CHEF" || role === "PAYMENTAGENT") {
        const employee = await prisma.user.findUnique({ where: { id: userId } });
        if (!employee?.employerRestaurantId) return null;
        return prisma.restaurant.findUnique({ where: { id: employee.employerRestaurantId } });
    }
    return null;
}
