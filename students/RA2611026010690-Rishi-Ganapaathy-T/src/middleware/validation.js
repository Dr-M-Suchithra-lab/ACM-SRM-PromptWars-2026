/**
 * Request Validation Middleware using Zod
 * Enforces strong input validation, type coercion, and sanitization on all endpoints.
 */

const { z } = require('zod');

/**
 * Validate request body against a Zod schema
 * @param {z.ZodSchema} schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request payload',
          issues: err.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };
}

// Schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(100),
  password: z.string().min(1, 'Password is required').max(100),
});

const checkInSchema = z.object({
  shiftId: z.string().optional(),
  siteCode: z.string().min(2).max(20).optional(),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

const grievanceSchema = z.object({
  title: z.string().min(1).max(150),
  description: z.string().min(1).max(2000),
  category: z.string().min(2).max(50),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  photoUrl: z.string().max(2 * 1024 * 1024).optional().nullable(),
  voiceInputUsed: z.boolean().default(false),
});

const grievanceStatusSchema = z.object({
  status: z.enum(['Submitted', 'Acknowledged', 'In Progress', 'Resolved']),
  replyMessage: z.string().max(1000).optional().nullable(),
});

const feedbackSchema = z.object({
  category: z.string().min(2).max(50),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().min(1).max(1000),
});

const passportItemSchema = z.object({
  type: z.enum(['skill', 'certification', 'training']),
  name: z.string().max(100).optional(),
  title: z.string().max(150).optional(),
  course: z.string().max(150).optional(),
  level: z.string().max(50).optional(),
  hours: z.coerce.number().optional(),
  issueDate: z.string().optional(),
  validUntil: z.string().optional(),
  completedOn: z.string().optional(),
});

module.exports = {
  validateBody,
  loginSchema,
  checkInSchema,
  grievanceSchema,
  grievanceStatusSchema,
  feedbackSchema,
  passportItemSchema,
};

