import React from "react";
import Button from "./Button"; // Assuming you have a Button component

const Governance = () => {
  return (
    <div className="mt-20 n p-6 lg:p-8">
      {/* Governance Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-n-1">Governance</h1>
        <p className="text-lg text-n-2 mt-2">
          Participate in the decision-making process by voting on proposals.
        </p>
      </header>

      {/* Proposal List */}
      <section className="space-y-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="bg-n-8 border border-n-6 rounded-lg p-6"
          >
            <h2 className="text-2xl font-semibold text-n-1 mb-2">
              Proposal {index + 1}
            </h2>
            <p className="text-n-2 mb-4">
              This is a brief description of proposal {index + 1}. It outlines the key points and objectives.
            </p>
            <div className="flex items-center space-x-4">
              <Button>Vote For</Button>
              <Button>Vote Against</Button>
            </div>
          </div>
        ))}
      </section>

      {/* Create Proposal Button */}
      <div className="mt-12 flex justify-center">
        <Button className="px-6 py-3 text-lg">Create New Proposal</Button>
      </div>
    </div>
  );
};

export default Governance;
