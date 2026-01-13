<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useFileStore } from '../../stores/files';
import { useTheme } from '../../composables/useTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const store = useFileStore();
const { isDark } = useTheme();

const chartData = computed(() => {
  const data = store.filesByDate;
  const labels = Object.keys(data);
  const values = Object.values(data);

  return {
    labels,
    datasets: [
      {
        label: 'Modified Files',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          if (isDark.value) {
            gradient.addColorStop(0, 'rgba(110, 133, 96, 0.5)'); // primary-light
            gradient.addColorStop(1, 'rgba(110, 133, 96, 0)');
          } else {
            gradient.addColorStop(0, 'rgba(93, 112, 82, 0.5)'); // primary
            gradient.addColorStop(1, 'rgba(93, 112, 82, 0)');
          }
          return gradient;
        },
        borderColor: isDark.value ? '#6E8560' : '#5D7052',
        pointBackgroundColor: isDark.value ? '#6E8560' : '#5D7052',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: isDark.value ? '#6E8560' : '#5D7052',
        fill: true,
        tension: 0.4,
        data: values
      }
    ]
  };
});

const chartOptions = computed(() => {
  const textColor = isDark.value ? '#E6DCCD' : '#2C2C24';
  const gridColor = isDark.value ? 'rgba(255, 255, 255, 0.1)' : 'rgba(222, 216, 207, 0.3)';
  const tooltipBg = isDark.value ? '#242422' : '#FDFCF8';
  const tooltipBorder = isDark.value ? 'rgba(255, 255, 255, 0.1)' : '#DED8CF';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: isDark.value ? '#6E8560' : '#5D7052',
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          font: {
            family: 'Nunito',
            size: 12
          },
          color: textColor
        }
      },
      y: {
        grid: {
          color: gridColor,
          drawBorder: false
        },
        ticks: {
          font: {
            family: 'Nunito',
            size: 11
          },
          color: textColor,
          stepSize: 1
        },
        beginAtZero: true
      }
    }
  };
});
</script>

<template>
  <div class="h-64 w-full">
    <Line v-if="Object.keys(store.filesByDate).length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="h-full flex items-center justify-center text-foreground/40 text-sm">
      No activity data
    </div>
  </div>
</template>
