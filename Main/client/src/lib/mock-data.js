export const people = [];
export const communities = [];
export const conversations = [];
export const chatMessages = [];
export const notifications = [];
export const activities = [];
export const events = [];
export const news = [];
export const growthData = [];
export function initials(name) {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("");
}
export const roleLabel = {
    entrepreneur: "Entrepreneur",
    investor: "Investor",
    client: "Client",
};
