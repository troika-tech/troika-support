import { Router } from 'express';
import authRoutes from './auth.routes';
import aiRoutes from './ai.routes';
import knowledgeRoutes from './knowledge.routes';
import adminRoutes from './admin.routes';
import simulationRoutes from './simulation.routes';
// import usersRoutes from './users.routes';
// import teamsRoutes from './teams.routes';
// import groupsRoutes from './groups.routes';
// import scenariosRoutes from './scenarios.routes';
// import sessionsRoutes from './sessions.routes';
// import chatRoutes from './chat.routes';
// import analyticsRoutes from './analytics.routes';

const router = Router();

// Register routes
router.use('/auth', authRoutes);
router.use('/ai', aiRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/admin', adminRoutes);
router.use('/simulation', simulationRoutes);
// router.use('/users', usersRoutes);
// router.use('/teams', teamsRoutes);
// router.use('/groups', groupsRoutes);
// router.use('/scenarios', scenariosRoutes);
// router.use('/sessions', sessionsRoutes);
// router.use('/chat', chatRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;
