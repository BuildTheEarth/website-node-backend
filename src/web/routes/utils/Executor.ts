import { Request, Response } from 'express';

export type Executor = (request: Request, response: Response) => void;
