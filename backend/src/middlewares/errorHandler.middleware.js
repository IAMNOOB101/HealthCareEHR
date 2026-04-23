const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
};

export default errorHandler;