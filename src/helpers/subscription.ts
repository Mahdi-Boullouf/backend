export const isSubscriptionActive = (restaurant: { subscriptionEndAt: Date | null } | null): boolean =>
    !!restaurant?.subscriptionEndAt && restaurant.subscriptionEndAt > new Date();
