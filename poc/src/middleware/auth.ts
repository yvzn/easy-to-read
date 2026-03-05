import { Request, Response, NextFunction } from "express";

export const authenticateRequest = (req: Request, res: Response, next: NextFunction) => {
	const code = req.query.code as string;

	if (!code) {
		return res.status(401).json({ error: "Authentication required" });
	}

	const apiKeys = process.env.API_KEYS?.split(",").map(key => key.trim()) || [];

	if (apiKeys.length === 0) {
		return res.status(500).json({ error: "Server configuration error" });
	}

	if (!apiKeys.includes(code)) {
		return res.status(401).json({ error: "Authentication required" });
	}

	next();
};
