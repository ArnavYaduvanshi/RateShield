import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser'
import { correlationIdMiddleware } from './middlewares/correlationId.middleware.js';
import { errorHandlerMiddleware } from './middlewares/errorHandler.middleware.js';
import routes from './routes/index.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())
app.use(correlationIdMiddleware);
app.use('/health', healthRoutes);

app.use(express.static('/app/apps/dashboard/dist'));

app.use('/api',routes);
app.get('*', (req, res) => {
    res.sendFile('/app/apps/dashboard/dist/index.html');
});
app.use(errorHandlerMiddleware);

export default app;