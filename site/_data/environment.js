export default function () {
	return {
		healthCheckUrl: process.env.HEALTH_CHECK_URL,
		simplifiedTextUrl: process.env.SIMPLIFIED_TEXT_URL,
		interactionUrl: process.env.INTERACTION_URL,
	};
}
