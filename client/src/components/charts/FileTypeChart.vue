<script setup lang="ts">
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useFileStore } from '../../stores/files';
import { useTheme } from '../../composables/useTheme';

ChartJS.register(ArcElement, Tooltip, Legend);

const store = useFileStore();
const { isDark } = useTheme();

const chartData = computed(() => {
  const data = store.filesByType;
  const labels = Object.keys(data);
  const values = Object.values(data);

  return {
    labels,
    datasets: [
      {
        backgroundColor: ['#5D7052', '#C18C5D', '#E6DCCD', '#78786C', '#DED8CF', '#2C2C24'],
        data: values,
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  };
});

const chartOptions = computed(() => {
  const textColor = isDark.value ? '#E6DCCD' : '#2C2C24';
  const tooltipBg = isDark.value ? '#242422' : '#FDFCF8';
  const tooltipBorder = isDark.value ? 'rgba(255, 255, 255, 0.1)' : '#DED8CF';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          font: {
            family: 'Nunito',
            size: 12
          },
          color: textColor
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: '#5D7052',
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return ` ${context.label}: ${context.raw} files`;
          }
        }
      }
    },
    cutout: '65%'
  };
});
</script>

<template>
  <div class="h-64 w-full">
    <Doughnut v-if="Object.keys(store.filesByType).length > 0" :data="chartData" :options="chartOptions" />
    <div v-else class="h-full flex items-center justify-center text-foreground/40 text-sm">
      No data available
    </div>
  </div>
</template>
