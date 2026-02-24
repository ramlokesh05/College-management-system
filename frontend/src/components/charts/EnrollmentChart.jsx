import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const EnrollmentChart = ({ data = [] }) => (
  <div className="h-64 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(249,115,22,0.22)" />
        <XAxis dataKey="month" stroke="#c26a2f" tickLine={false} axisLine={false} />
        <YAxis stroke="#c26a2f" tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(249,115,22,0.14)" }}
          contentStyle={{
            borderRadius: "0.8rem",
            border: "1px solid rgba(249,115,22,0.32)",
            background: "rgba(255, 255, 255, 0.94)",
            color: "#1f2937",
          }}
        />
        <Bar dataKey="admissions" fill="#f97316" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default EnrollmentChart;

