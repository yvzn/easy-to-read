/* global Chart */
'use strict';

const PALETTE = [
  '#1C64F2',
  '#3F83F8',
  '#76A9FA',
  '#6875F5',
  '#A78BFA',
  '#C084FC',
  '#E879F9',
  '#F472B6',
  '#FB923C',
  '#FBBF24',
  '#34D399',
  '#2DD4BF',
];

document.addEventListener('DOMContentLoaded', () => {
  // Doughnut charts
  document.querySelectorAll('[data-chart="doughnut"]').forEach((canvas) => {
    const el = /** @type {HTMLCanvasElement} */ (canvas);
    const labels = JSON.parse(el.dataset.labels || '[]');
    const values = JSON.parse(el.dataset.values || '[]');
    const total = values.reduce((a, b) => a + b, 0);

    new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: PALETTE.slice(0, labels.length),
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '68%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} (${total > 0 ? Math.round((ctx.parsed / total) * 100) : 0}%)`,
            },
          },
        },
      },
    });
  });

  // Bar chart
  document.querySelectorAll('[data-chart="bar"]').forEach((canvas) => {
    const el = /** @type {HTMLCanvasElement} */ (canvas);
    const labels = JSON.parse(el.dataset.labels || '[]');
    const values = JSON.parse(el.dataset.values || '[]');

    new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Interactions',
            data: values,
            backgroundColor: '#1C64F2',
            hoverBackgroundColor: '#1A56DB',
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} interaction${ctx.parsed.y !== 1 ? 's' : ''}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: '#F3F4F6' },
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, minRotation: 0 },
          },
        },
      },
    });
  });

  // Line chart
  document.querySelectorAll('[data-chart="line"]').forEach((canvas) => {
    const el = /** @type {HTMLCanvasElement} */ (canvas);
    const labels = JSON.parse(el.dataset.labels || '[]');
    const values = JSON.parse(el.dataset.values || '[]');
    const median = JSON.parse(el.dataset.median || 'null');
    const p95 = JSON.parse(el.dataset.p95 || 'null');
    const p99 = JSON.parse(el.dataset.p99 || 'null');
    const yLabel = el.dataset.ylabel || '';

    const hasPercentiles = median && p95 && p99;

    const datasets = hasPercentiles
      ? [
          {
            label: 'Avg',
            data: values,
            borderColor: '#1C64F2',
            backgroundColor: 'rgba(28,100,242,0.06)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
          },
          {
            label: 'Median (p50)',
            data: median,
            borderColor: '#10B981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.3,
            borderDash: [],
          },
          {
            label: 'p95',
            data: p95,
            borderColor: '#F59E0B',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.3,
            borderDash: [4, 4],
          },
          {
            label: 'p99',
            data: p99,
            borderColor: '#EF4444',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.3,
            borderDash: [2, 2],
          },
        ]
      : [
          {
            label: yLabel,
            data: values,
            borderColor: '#1C64F2',
            backgroundColor: 'rgba(28,100,242,0.08)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
          },
        ];

    new Chart(el, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { display: hasPercentiles },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} ms`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: '#F3F4F6' },
            title: { display: true, text: 'ms' },
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, minRotation: 0 },
          },
        },
      },
    });
  });
});
