'use client'
import React, { useEffect, useRef } from 'react'
import {
	BarChart, Bar, Cell, XAxis, YAxis, Legend, Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts';
import {
    ValueType,
    NameType,
} from 'recharts/types/component/DefaultTooltipContent';
import Color from 'color'
import { precise } from '@/utils/math';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import { useQueryState } from 'next-usequerystate';
import download from 'downloadjs'
import domtoimage from 'dom-to-image';

const libs_sorted = ['ARCHS4 Coexpression','ENCODE ChIP-seq','Enrichr Queries',
	'GTEx Coexpression','Literature ChIP-seq','ReMap ChIP-seq']
const palette =  {'ARCHS4 Coexpression':'rgb(196, 8, 8)',
	'ENCODE ChIP-seq':'rgb(244, 109, 67)',
	'Enrichr Queries':'rgb(242, 172, 68)', 
	'GTEx Coexpression':'rgb(236, 252, 68)',
	'Literature ChIP-seq':'rgb(165, 242, 162)',
	'ReMap ChIP-seq':'rgb(92, 217, 78)'}
const renderCustomizedLabel = (props) => {
	const {
	  x, y, width, height, value, color
	} = props;
	// const radius = 10;
	const background = Color(color)
	const fontColor = background.isDark() ? "#FFF": "#000"
	const transfomedX = width < 0 ? x-5: x+5
	const textAnchor = width < 0 ? "end": "start"
	return (
	  <g>
		<text x={transfomedX} y={y+(height/2) + 4} width={width} fill={fontColor} textAnchor={textAnchor} fontSize={15}>
		  {value}
		</text>
	  </g>
	);
  };

  const BarTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
	if (active) {
		const {enrichr_label, score, overlap, combined_score, libs} = payload[0].payload
		console.log(libs)
		return(
			<Card sx={{opacity:"0.8", textAlign: "left"}}>
				<CardContent>
					<Typography variant="subtitle2"><b>{enrichr_label}</b></Typography>
					{ score && <Typography variant="subtitle2"><b>Mean Rank:</b> {precise(score)}</Typography>}
					{ overlap && <Typography variant="subtitle2"><b>Overlapping Genes:</b> {precise(overlap)}</Typography>}
					{ combined_score && <Typography variant="subtitle2"><b>combined score:</b> {precise(combined_score)}</Typography>}
					{libs.map(({library, score})=>(
						<Typography key={library} variant="subtitle2"><b>{library}</b> {score}</Typography>
					))}
				</CardContent>
			</Card>
		)
	} return null
}

export const EnrichmentBar = (props: {
	field?: string,
	data: Array<{library: string, score: number, value?: number, [key: string]: number | string | boolean | Array<{library: string, score: number}>}>,
	color?: string,
	fontColor?: string,
	maxHeight?: number,
	barSize?: number,
	width?: number
	min: number,
	max: number,
	stacks: Array<string>
}) => {
	const {
		   field="",
		   data,
		   color="#0063ff",
		   fontColor="#FFF",
		   maxHeight=500,
		   barSize=35,
		   width=500,
		   min,
		   max,
		   stacks
		} = props
	const height = data.length === 10 ? maxHeight: maxHeight/10 * data.length
	let yWidth = 0
	const data_cells = []
	const barRef = useRef(null);
	const ref = useRef(null);
	for (const index in data) {
		const i = data[index]
		if (yWidth < i.library.length) yWidth = i.library.length
		data_cells.push(<Cell key={`${field}-${index}`} />)
	}
	const [download_image, setDownloadImage] = useQueryState('download_image')

	// function exportChart() {

	// 	// A Recharts component is rendered as a div that contains namely an SVG
	// 	// which holds the chart. We can access this SVG by calling upon the first child/
	// 	let chartSVG = ReactDOM.findDOMNode(barRef.current).children[0];
	// 	console.log(chartSVG)
	// 	console.log(barRef.current.select)
	// 	let svgURL = new XMLSerializer().serializeToString(barRef.current);
	// 	let svgBlob = new Blob([svgURL], {type: "image/svg;"});
	// 	download(svgBlob, "bar_chart.svg");
	// }
	useEffect(()=>{
		const download_fnc = async () => {
			// exportChart(download_image)
			if (download_image === 'png') {
				if (ref.current) {
					const blob = await domtoimage.toBlob(ref.current)
					download(blob, `bar_chart.png`);
				}
			} else if (download_image === 'jpg') {
				if (ref.current) {
					const dataUrl = await domtoimage.toJpeg(ref.current)
					const link = document.createElement('a');
					link.download = 'bar_chart.jpg';
					link.href = dataUrl;
					link.click();
				}
			} else if (download_image === 'svg') {
				const dataUrl = await domtoimage.toSvg(ref.current)
				const link = document.createElement('a');
				link.download = 'bar_chart.jpg';
				link.href = dataUrl;
				link.click();
			}
			setDownloadImage(null)
		}
		download_fnc()
		
	}, [download_image])
	return(
		<Grid container>
			<Grid item xs={12} ref={ref}>
				<ResponsiveContainer 
						height={height}
						width={'100%'}
						id="plot"
				>
					<BarChart
						layout="vertical"
						id="kg-network"
						height={height}
						width={width}
						data={data}// Save the ref of the chart
						ref={barRef}
					>
						<Tooltip content={<BarTooltip/>} />

						{/* <Bar dataKey="value" fill={"#C3E1E6"} barSize={barSize}>
							<LabelList dataKey="enrichr_label" position="left" content={renderCustomizedLabel} fill={fontColor}/>
							{data_cells}
						</Bar> */}
						{libs_sorted.filter(i=>stacks.indexOf(i)>-1).map((lib,i)=>{
							return(<Bar key={`${lib}-${i}`} dataKey={lib} stackId={'a'} fill={palette[lib]} barSize={barSize}>
								{/* {i === 0 && <LabelList dataKey="enrichr_label" position="left" content={renderCustomizedLabel} fill={fontColor}/>} */}
								{data_cells}
							</Bar>)
						})}
						<XAxis type="number" hide/>
						{/* <XAxis type="number" domain={[
							() => {
								if (min < 0) {
									return min
								} else {
									return 0
								}
							},
							() => {
								console.log(max)
								if (max > 0) {
									return max
								} else {
									return 0
								}
							},
						]}  hide/> */}
						<YAxis type="category" dataKey={"label"} width={yWidth*3} axisLine={false} fontSize={12}/>
						<Legend formatter={(value, entry, index)=><Typography sx={{color: '#666'}} variant='caption'>{value}</Typography>}/>
					</BarChart>
				</ResponsiveContainer>
			</Grid>
		</Grid>
	)
}
export default EnrichmentBar
