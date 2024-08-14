import React from 'react';
import Section from "./Section";
import { check } from "../assets";
import { collabContent, collabText } from "../constants";
import Button from "./Button";
import { LeftCurve, RightCurve } from "../design/Collaboration";
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import 'chart.js/auto';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

const pieChartData = {
  labels: [
    'Community and Airdrops',
    'Development and Bug Bounties',
    'Marketing',
    'Team',
    'Reserve'
  ],
  datasets: [{
    data: [20, 15, 15, 25, 25],
    backgroundColor: [
      '#FF6384', // Community and Airdrops
      '#36A2EB', // Development and Bug Bounties
      '#FFCE56', // Marketing
      '#4BC0C0', // Team
      '#F3A8C9'  // Reserve
    ],
    hoverBackgroundColor: [
      '#FF6384', // Community and Airdrops
      '#36A2EB', // Development and Bug Bounties
      '#FFCE56', // Marketing
      '#4BC0C0', // Team
      '#F3A8C9'  // Reserve
    ],
    borderWidth: 0, // Remove border for cleaner look
  }]
};

const Tokenomics = () => {
  return (
    <Section crosses className="overflow-hidden" id="tokenomics">
      <div className="container lg:flex">
        <div className="max-w-[25rem]">
          <h2 className="h1 mb-4 md:mb-8">Tokenomics</h2>

          <ul className="max-w-[22rem] mb-10 md:mb-14">
            {collabContent.map((item) => (
              <li className="mb-3 py-3" key={item.id}>
                <div className="flex items-center">
                  <img src={check} width={24} height={24} alt="check" />
                  <h6 className="body-2 ml-5">{item.title}</h6>
                </div>
                {collabText[item.id] && (
                  <p className="body-2 mt-3 text-n-4">
                    {collabText[item.id]}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <Button>Learn More</Button>
        </div>

        <div className="lg:ml-auto xl:w-[38rem] mt-4">
          <p className="body-2 mb-4 text-n-4 md:mb-16 lg:mb-32 lg:w-[22rem] lg:mx-auto">
            {collabText["0"]}
          </p>

          <div className="relative left-1/2 flex w-[22rem] aspect-square border border-n-6 rounded-full -translate-x-1/2 scale:75 md:scale-100">
            <Pie data={pieChartData} options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false, // Hide the legend if not needed
                },
                tooltip: {
                  callbacks: {
                    label: (tooltipItem) => {
                      const label = tooltipItem.label || '';
                      const value = tooltipItem.raw || 0;
                      return `${label}: ${value}%`;
                    }
                  }
                }
              }
            }} />
            <LeftCurve />
            <RightCurve />
          </div>
        </div>
      </div>
    </Section>
  );
};

export default Tokenomics;
