import React from 'react';

interface KPIProps {
    icon: React.ReactElement<{ className?: string }>;
    title: string;
    value: string | number;
    color: 'blue' | 'green' | 'purple';
}

const colorClasses = {
    blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
    },
    green: {
        bg: 'bg-green-100',
        text: 'text-green-600',
    },
    purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-600',
    },
};

const KPI: React.FC<KPIProps> = ({ icon, title, value, color }) => {
    const classes = colorClasses[color];

    return (
        <div className="bg-white shadow-md rounded-lg p-5 flex items-center space-x-4">
            <div className={`p-3 rounded-full ${classes.bg}`}>
                {React.cloneElement(icon, { className: `h-7 w-7 ${classes.text}` })}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
};

export default KPI;