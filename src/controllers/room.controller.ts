import { Request, Response } from 'express';

export const helloWorld = (_: Request, res: Response) => {
  res.send('Hello World');
};
