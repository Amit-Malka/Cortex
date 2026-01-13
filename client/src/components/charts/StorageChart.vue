<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { useFileStore } from '../../stores/files';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const store = useFileStore();

const chartData = computed(() => {
  const data = store.storageBySize;
  const labels = Object.keys(data);
  const values = Object.values(data);

  return {
    labels,
    datasets: [
      {
        label: 'File Count',
        backgroundColor: ['#E6DCCD', '#C18C5D', '#5D7052'],
        borderRadius: 8,
        data: values,
        barThickness: 40
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#FDFCF8',
      titleColor: '#2C2C24',
      bodyColor: '#5D7052',
      borderColor: '#DED8CF',
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
        color: '#2C2C24'
      }
    },
    y: {
      grid: {
        color: 'rgba(222, 216, 207, 0.3)', // #DED8CF with opacity
        drawBorder: false
      },
      ticks: {
        font: {
          family: 'Nunito',
          size: 11
        },
        color: '#78786C',
        stepSize: 1
      },
      beginAtZero: true
    }
  }
};
</script>

<template>
  <div class="h-64 w-full">
    <Bar v-if="Object.values(store.storageBySize).some(v => v > 0)" :data="chartData" :options="chartOptions" />
    <div v-else class="h-full flex items-center justify-center text-foreground/40 text-sm">
      No files loaded
    </div>
  </div>
</template>
