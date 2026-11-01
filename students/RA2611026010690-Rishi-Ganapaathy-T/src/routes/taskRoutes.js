/**
 * Per-Person Tasks Folder Routes
 * Manages individual task folders (tasks/<person-slug>/tasks.json) for Construction & College portals.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { getRepository } = require('../repos');

const VALID_TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * GET /api/tasks
 * Returns the authenticated person's task folder, plus all sector staff folders if admin.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const repo = getRepository();
    const currentUser = await repo.findUserById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'NotFound', message: 'User not found' });
    }

    const myTasks = await repo.listTasks({ workerId: currentUser.id });
    const myFolder = {
      workerId: currentUser.id,
      name: currentUser.name,
      roleTitle: currentUser.roleTitle,
      department: currentUser.department,
      avatar: currentUser.avatar,
      industry: currentUser.industry,
      folderPath: `tasks/${currentUser.folderSlug || currentUser.id}`,
      tasks: myTasks,
    };

    if (currentUser.role === 'admin') {
      const sectorUsers = await repo.listUsers({ industry: currentUser.industry });
      const folders = await Promise.all(
        sectorUsers.map(async (u) => {
          const tasks = await repo.listTasks({ workerId: u.id });
          return {
            workerId: u.id,
            name: u.name,
            role: u.role,
            roleTitle: u.roleTitle,
            department: u.department,
            avatar: u.avatar,
            industry: u.industry,
            folderPath: `tasks/${u.folderSlug || u.id}`,
            tasks,
          };
        })
      );
      return res.json({ industry: currentUser.industry, myFolder, folders });
    }

    return res.json({ industry: currentUser.industry, myFolder, folders: [myFolder] });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/tasks
 * Create/assign a new task inside a person's tasks folder (Admin only)
 */
router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const repo = getRepository();
    const currentUser = await repo.findUserById(req.user.id);
    const { workerId, title, description = '', priority = 'medium', dueShift = '' } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'ValidationError', message: 'Task title is required.' });
    }

    // Admin can assign to anyone in their sector
    const targetWorkerId = workerId || currentUser.id;
    const targetUser = await repo.findUserById(targetWorkerId);

    if (!targetUser || targetUser.industry !== currentUser.industry) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot assign tasks outside your active sector portal.',
      });
    }

    const safePriority = VALID_PRIORITIES.includes(priority) ? priority : 'medium';

    const created = await repo.createTask({
      workerId: targetUser.id,
      workerName: targetUser.name,
      folderPath: `tasks/${targetUser.folderSlug || targetUser.id}`,
      industry: targetUser.industry,
      department: targetUser.department,
      title: String(title).trim(),
      description: String(description).trim(),
      priority: safePriority,
      dueShift: String(dueShift).trim(),
      assignedBy: currentUser.name,
      assignedByRole: currentUser.roleTitle || currentUser.role,
    });

    return res.status(201).json({ task: created });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Update task status (Workers can update whether completed or not; Admins have full power)
 */
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!VALID_TASK_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Invalid task status.' });
    }

    const repo = getRepository();
    const updated = await repo.updateTaskStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });
    }

    return res.json({ task: updated });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task from a person's folder (Admin only)
 */
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const repo = getRepository();
    const deleted = await repo.deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'NotFound', message: 'Task not found.' });
    }
    return res.json({ deleted: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;

