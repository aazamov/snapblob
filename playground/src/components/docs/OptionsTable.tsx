interface Option {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface OptionsTableProps {
  options: Option[];
}

export default function OptionsTable({ options }: OptionsTableProps) {
  return (
    <div className="options-table-wrap">
      <table className="options-table">
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {options.map((opt) => (
            <tr key={opt.name}>
              <td><code>{opt.name}</code></td>
              <td><code className="type">{opt.type}</code></td>
              <td>{opt.default ? <code>{opt.default}</code> : <span className="text-muted">--</span>}</td>
              <td>{opt.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
