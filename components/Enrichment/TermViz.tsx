import { precise } from "@/utils/math";
import EnrichmentBar from "./EnrichmentBar";
import NetworkTable from "./NetworkTable";
import { Typography, CircularProgress, Box } from "@mui/material";
import dynamic from "next/dynamic";
import { EnrichmentParams } from ".";
import { get_element } from "./element_resolver";
import { NetworkSchema } from "@/app/api/knowledge_graph/route";

const Cytoscape = dynamic(()=>import('../Cytoscape'),
	{
		ssr: false,
		loading: ()=><CircularProgress sx={{position: "absolute", top: "50%", left: "50%"}}/>
	}
)
const TermViz = ({view, elements}:
	{
		view?: string,
		elements: NetworkSchema
	}) => {
	const entries:{[key:string]: {library: string, score: number, [key: string]: number | string | boolean | Array<{library: string, score: number}>}} = {}
	const columns:{[key:string]: boolean} = {}
	const libraries = []
	for (const dt of [...elements.nodes, ...elements.edges]) {
		const {label, id: i, kind, color, gradient_color, libs, ...properties} = dt.data
		if (dt.data.kind !== "Relation") {
			const {enrichr_label} = properties
			const id = `${properties.library}: ${enrichr_label} (${i})`
			if (entries[id] === undefined && kind !== "Search TFs") {
				const {
					library,
					score,
					value
				} = properties
			
				entries[id] = {
					id,
					label,
					kind,
					libs,
					// enrichr_label,
					...properties,
					library: `${library}`,
					score: typeof score === 'number' ? parseFloat(`${precise(score)}`): typeof score === 'string'? parseFloat(score) :undefined,
					value: typeof value === 'number' ? parseFloat(`${precise(value)}`): typeof value === 'string'? parseFloat(value) :undefined,
					color: `${color}`,
				}
				// const libs = properties['libs'] || []
				if (Array.isArray(libs) && entries[id].rank_sum !== undefined && typeof(entries[id].rank_sum) == 'number') {
					const rank_sum = entries[id].rank_sum as number
					for (const {library, score} of libs) {
						entries[id][library] = (parseInt(`${score}`)*entries[id].score)/rank_sum
						if (libraries.indexOf(library) === -1) libraries.push(library)
					}	
				}
				
				for (const [k,v] of Object.entries(entries[id])) {
					if (v !== undefined) columns[k] = true
				}
			}
			
		}
	}
	// ignore expanded nodes for table and barchart
	const sorted_entries = Object.values(entries).filter(a=>a.kind !== "Expanded TFs").sort((a,b)=>a.score - b.score)
	if (sorted_entries.length === 0) return <Typography variant="h5">No Results Found</Typography>
	else {
		if (view === 'network' || !view) return (
			<Box sx={{position: "relative", minHeight: 450}}>
				<Cytoscape 
					elements={elements}
					search={false}
				/> 
			</Box>
		) 
		else if (view === "table") return (
			<NetworkTable sorted_entries={sorted_entries} columns={columns}/>
		) 
		else if (view === "bar") {
			return(
				<EnrichmentBar data={sorted_entries} stacks={libraries}
					max={sorted_entries[0]["value"] as number}
					min={sorted_entries[sorted_entries.length - 1]["value"] as number}
					width={900}
				/>
			)}
	}
}

export default TermViz