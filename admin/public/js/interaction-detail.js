function applyLineBreaks(checked) {
	['input-display', 'output-display'].forEach(function (id) {
		var el = document.getElementById(id);
		if (!el) return;
		var raw = el.dataset.raw || '';
		if (checked) {
			el.innerHTML = '';
			var parts = raw.split('\\n');
			parts.forEach(function (part, idx) {
				el.appendChild(document.createTextNode(part));
				if (idx < parts.length - 1) el.appendChild(document.createElement('br'));
			});
		} else {
			el.textContent = raw;
		}
	});
}
document.addEventListener('DOMContentLoaded', function () {
	applyLineBreaks(true);
	document.getElementById('render-linebreaks').addEventListener('change', function () {
		applyLineBreaks(this.checked);
	});
});
