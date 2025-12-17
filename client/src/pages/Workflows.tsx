
import { GitBranch, Settings } from 'lucide-react';

export default function Workflows() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Workflow Orchestration</h2>
        <p className="text-gray-400 mt-2">Manage global system behavior and agent configurations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GitBranch size={20} className="text-indigo-400" />
            Active Workflows
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded border border-gray-700">
              <div>
                <div className="font-medium">ContentSys-Engine</div>
                <div className="text-xs text-gray-500">Steps: Nexus → Vantage → Vertex → Hemingway → Prism</div>
              </div>
              <span className="px-2 py-1 bg-green-900 text-green-200 text-xs rounded">Active</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded border border-gray-700">
              <div>
                <div className="font-medium">Multimedia-Pipeline</div>
                <div className="text-xs text-gray-500">Steps: Canvas → Lens → Pixel → Mosaic → Deployer</div>
              </div>
              <span className="px-2 py-1 bg-green-900 text-green-200 text-xs rounded">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings size={20} className="text-indigo-400" />
            Global Model Configuration
          </h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Default Strategy Model</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 outline-none">
                <option>Minimax M2</option>
                <option>GPT-4o</option>
                <option>Claude 3.5 Sonnet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Default Writer Model</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded p-2 outline-none">
                <option>Minimax M2</option>
                <option>GPT-4o</option>
              </select>
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded text-sm w-full">Update Configuration</button>
          </form>
        </div>
      </div>
    </div>
  );
}
