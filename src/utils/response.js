const successResponse = (res, data, message = "Operation successful", statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        message
    });
};

const errorResponse = (res, message = "Operation failed", errorCode = null, statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errorCode
    });
};

module.exports = { successResponse, errorResponse };
