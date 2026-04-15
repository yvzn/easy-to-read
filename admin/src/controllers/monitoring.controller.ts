import { Request, Response, NextFunction } from "express";
import { storageService } from "../services/storage.service.js";

export const getMonitoring = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const interval = (req.query.interval as string) || "day";
		if (!["day", "week", "month", "year"].includes(interval)) {
			res.status(400).render("error", { message: "Invalid interval parameter" });
			return;
		}

		const sort = (req.query.sort as string) || "desc";
		if (!["asc", "desc"].includes(sort)) {
			res.status(400).render("error", { message: "Invalid sort parameter" });
			return;
		}

		const stats = await storageService.getMonitoringStats(
			interval as "day" | "week" | "month" | "year",
		);
		const sortedStats = sort === "asc" ? stats : [...stats].reverse();
		const sortMeta = {
			next: sort === "asc" ? "desc" : "asc",
			arrow: sort === "asc" ? "↑" : "↓",
		};
		const periodLabel = stats.length === 1 ? "period" : "periods";
		const chartData = {
			labels: JSON.stringify(stats.map((s) => s.period)),
			avgValues: JSON.stringify(stats.map((s) => s.avgDuration)),
			medianValues: JSON.stringify(stats.map((s) => s.medianDuration)),
			p95Values: JSON.stringify(stats.map((s) => s.p95Duration)),
			p99Values: JSON.stringify(stats.map((s) => s.p99Duration)),
		};
		const intervalOptions = ["day", "week", "month", "year"] as const;
		const intervalLinks = intervalOptions.map((value) => ({
			value,
			label:
				value === "day"
					? "Daily"
					: value === "week"
						? "Weekly"
						: value === "month"
							? "Monthly"
							: "Yearly",
			href: `/monitoring?interval=${value}&sort=${sort}`,
			className:
				interval === value
					? "bg-blue-700 text-white border-blue-700"
					: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
		}));

		res.render("monitoring", {
			stats,
			sortedStats,
			interval,
			sort,
			sortMeta,
			periodLabel,
			chartData,
			intervalLinks,
		});
	} catch (error) {
		next(error);
	}
};
