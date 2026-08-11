const getClientIp = (req) => {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        req.headers["x-real-ip"] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        null
    );
};

const getUserAgent = (req) => {
    return req.headers["user-agent"] || null;
};

module.exports = { getClientIp, getUserAgent };