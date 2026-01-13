<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';
import { useFileStore } from '../../stores/files';
import { useTheme } from '../../composables/useTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const store = useFileStore();
const { isDark } = useTheme();

const chartData = computed(() => {
  const data = store.topOwners;
  const labels = Object.keys(data);
  const values = Object.values(data);

  return {
    labels,
    datasets: [
      {
        label: 'Files Owned',
        backgroundColor: isDark.value ? '#C18C5D' : '#C18C5D', // Terracotta
        borderRadius: 4,
        data: values,
        barThickness: 20
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
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: '#C18C5D',
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
      },
      y: {
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
      }
    }
  };
});
</script>

<template>
  <div class="h-64 w-full">
    <Bar v-if="Object.keys(store.topOwners).length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="h-full flex items-center justify-center text-foreground/40 text-sm">
      No owner data
    </div>
  </div>
</template>
