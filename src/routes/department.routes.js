const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { successResponse } = require('../utils/response');
const { verifyToken, requireRole } = require('../middlewares/auth');

router.use(verifyToken);

// Anyone authenticated can fetch departments for dropdowns
router.get('/', async (req, res, next) => {
    try {
        const departments = await prisma.department.findMany({
            orderBy: { name: 'asc' }
        });
        return successResponse(res, departments);
    } catch (error) {
        next(error);
    }
});

router.post('/', requireRole('ADMIN'), async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Department name is required" });

        const dept = await prisma.department.create({
            data: { name: name.toUpperCase() }
        });
        return successResponse(res, dept, "Department created successfully", 201);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
