export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/agendar/:path*", "/dashboard/:path*", "/me/:path*"],
};
