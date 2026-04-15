import { Request, Response, NextFunction } from "express";
import { storageService } from "../services/storage.service.js";
import { FeedbackWithTimestamp } from "../types/index.js";

export const getFeedbacks = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const filter = (req.query.filter as string) || "";
		// Limit filter length for safety
		const safeFilter = filter.substring(0, 200);

		const sort = (req.query.sort as string) || "desc";
		if (!["asc", "desc"].includes(sort)) {
			res.status(400).render("error", { message: "Invalid sort parameter" });
			return;
		}

		const feedbacks = await storageService.getFeedbacks(safeFilter || undefined);

		const feedbacksWithTimestamp: (FeedbackWithTimestamp & {
			detailUrl: string;
			scoreClass: string;
		})[] = feedbacks.map((f) => ({
			...f,
			formattedTimestamp: f.timestamp
				? new Date(f.timestamp).toISOString().replace("T", " ").substring(0, 19)
				: "N/A",
			detailUrl: `/interactions/${encodeURIComponent(f.InteractionId)}`,
			scoreClass:
				Number(f.Score) > 0
					? "bg-green-100 text-green-800"
					: Number(f.Score) === 0
						? "bg-yellow-100 text-yellow-800"
						: "bg-red-100 text-red-800",
		}));

		feedbacksWithTimestamp.sort((a, b) => {
			const ta = a.timestamp ?? "";
			const tb = b.timestamp ?? "";
			return sort === "asc" ? ta.localeCompare(tb) : tb.localeCompare(ta);
		});

		const sortMeta = {
			next: sort === "asc" ? "desc" : "asc",
			arrow: sort === "asc" ? "↑" : "↓",
		};
		const filterQuery = safeFilter ? `filter=${encodeURIComponent(safeFilter)}&` : "";
		const sortHref = `/feedback?${filterQuery}sort=${sortMeta.next}`;
		const feedbackCountLabel = feedbacksWithTimestamp.length === 1 ? "result" : "results";

		res.render("feedback", {
			feedbacks: feedbacksWithTimestamp,
			filter: safeFilter,
			sort,
			sortMeta,
			sortHref,
			feedbackCountLabel,
		});
	} catch (error) {
		next(error);
	}
};

export const deleteFeedback = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const { rowKey } = req.body as { rowKey: string };
		if (!rowKey || typeof rowKey !== "string" || rowKey.trim() === "") {
			res.status(400).render("error", { message: "Invalid rowKey" });
			return;
		}
		await storageService.deleteFeedback("Feedbacks", rowKey.trim());
		res.redirect("/feedback");
	} catch (error) {
		next(error);
	}
};
