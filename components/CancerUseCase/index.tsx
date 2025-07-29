import React from "react";
import {
    Grid,
    Stack,
    Typography,
    Card,
    CardContent
} from "@mui/material";
import TermViz from "@/components/Enrichment/TermViz";
import { NetworkSchema } from "@/app/api/knowledge_graph/route";
import { parseAsJson } from "next-usequerystate";
import InteractiveButtons from "@/components/Enrichment/InteractiveButtons";
import { fetch_kg_schema, fetch_atlas_schema } from "@/utils/initialize";
import TooltipComponentGroup from "../TermAndGeneSearch/tooltip";
import QueryForm from "./QueryForm";
import Link from "next/link";
import { get_element } from "../Enrichment/element_resolver";
export interface EnrichmentParams {
    group_name?: string,
    userListId?: string,
    term?: string,
    term_limit?: number,
    gene_limit?: number,
    min_lib?: number,
    gene_degree?: number,
    term_degree?: number,
    augment?: boolean,
    augment_limit?: number,
    gene_links?: Array<string>,
    search?: boolean,
    expand?: Array<string>,
    remove?: Array<string>,
    additional_link_tags?: Array<string>,
    pvalue?: number,
    zscore?: number,
    add_nodes?: number,
    limit?: number,
}


const Enrichment = async ({
    libraries: l,
    sortLibraries,
    searchParams,
    endpoint,
    ...props
}: {
    example?: {
        gene_set?: string,
    },
    libraries?: Array<{name: string, node: string, regex?: string}>,
    sortLibraries?: boolean,
    disableLibraryLimit?: boolean,
    disableHeader?: boolean,
    title?: string,
    description?: string,
    searchParams: {
        q?:string,
        fullscreen?: "true",
        view?: string,
        collapse?: "true"
    },
    endpoint: string,
    additional_link_relation_tags?: Array<string>,
    default_options?: {
        group_name?: string,
        term?: string,
    }

}) => {
    console.log("parsing")
    const query_parser = parseAsJson<EnrichmentParams>().withDefault(props.default_options)
    console.log("Getting schema...")
    const schema = await fetch_kg_schema()
    console.log("Schema fetched")
    console.log("Getting atlas schema...")
    const atlasschema = await fetch_atlas_schema()
    console.log("Atlas schema fetched")
        const celltype_info = {}
        for (const i of atlasschema.cancertype){
        celltype_info[i.term] = {
            type: i.type,
            tissue: i.tissue,
            enrichr_url: i.enrichr_url,
            m2t_url: i.m2t_url
        }
    } 


    const tooltip_templates_node = {}
    const tooltip_templates_edges = {}
    for (const i of schema.nodes) {
        tooltip_templates_node[i.node] = i.display
    }

    for (const e of schema.edges) {
        for (const i of e.match) {
        tooltip_templates_edges[i] = e.display
        }
    }
    const hiddenLinksRelations = schema.edges.reduce((acc, i)=>{
        if (i.hidden) return [...acc, ...i.match]
        else return acc
    }, [])
    
    const parsedParams: EnrichmentParams = query_parser.parseServerSide(searchParams.q)
    //console.log("to remove1", typeof parsedParams.remove[0])
    
    try {
        const cancer_types = await (await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ""}/api/enrichment/get_cancer_gene_sets`)).json()
        
        const default_group = props.default_options.group_name || Object.keys(cancer_types)[0]
        const default_term = props.default_options.term || Object.keys(cancer_types[default_group])[0]
        
        const {
            term=default_term,
            group_name=default_group,
        } = parsedParams

        let elements:NetworkSchema = null
        let shortId = ""
        let min_p = 1
        let max_p = 0
        let min_z = 100
        let max_z = 0
        let input_desc = `${group_name}: ${term}`
        let userListId = parsedParams.userListId
        if (term !==undefined && group_name !== undefined) {
            const formData = new FormData();
            console.log("test", group_name, term)

            // const gene_list = geneStr.trim().split(/[\t\r\n;]+/).join("\n")
            const genes = cancer_types[group_name][term]
            const gene_list = genes.join('\n')
            formData.append('list', gene_list)
            formData.append('description', `${group_name}: ${term}`)
            userListId = (await (
                await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ""}/api/enrichment/addList`, {
                    method: 'POST',
                    body: formData,
                })
            ).json()).userListId
            // parsedParams.userListId = userListId
            const parsed = await get_element({...parsedParams, userListId})
            elements = parsed.elements
            min_z = parsed.min_z
            max_z = parsed.max_z
        }
        const payload = {
            "url": `${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: "/"}${endpoint}${searchParams.q ? '?q=' + searchParams.q: ''}`,
            "apikey": process.env.TURL  
        }
        console.log("Getting short url")
        const request = await fetch(process.env.TURL_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })
        let short_url=null
        if (request.ok) short_url = (await request.json())["shorturl"]
        else console.log("failed turl")
        console.log("Got url")
        return (
            <Grid container spacing={2} >
                <Grid item xs={12}>
                    <Typography variant={"h2"}>{props.title || "Enrichment Analysis"}</Typography>
                    </Grid>
                {props.description && <Grid item xs={12}>
                    <Typography variant={"subtitle1"}> 
                    Explore TF subnetworks that are enriched for regulating marker gene sets idendified via transcriptomic analysis of 10 tumor types from the the Clinical Protemoics Tumor Atlas Consortium (CPTAC). Each tumor type is divided into subtypes based on clustering of patients 
                    in each cohort, for a total of 69 subtypes. Marker genes for each subtype are identified via differential gene expression analysis. Subtype identification and differential gene expression analysis for each tumor type was originally performed in  
                    <Link href='https://multiomics2targets.maayanlab.cloud/' 
                    target="_blank" 
                    rel="noopener noreferrer"><b> Multiomics2Targets</b></Link>.
                    </Typography>
                </Grid>}
                    {/* { props.disableHeader ? <Typography variant={"subtitle1"}>Enter a set of Entrez gene symbols below to perform transcription factor enrichment analysis using&nbsp;
                            <Link href={"https://maayanlab.cloud/chea3/"} 
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{color: "black", textDecoration: "underline"}}
                            >
                                <span style={{fontSize: 16, fontWeight: 700, fontFamily: "Rubik, sans-serif"}}>ChEA3</span>
                            </Link>. The result is a subnetwork of the ChEA-KG GRN, made of the top {add_nodes} mean-ranked transcription factors enriched for the query set.</Typography>:
                        <Typography variant="subtitle1" sx={{marginBottom: 3}}>Submit your gene set for enrichment analysis with &nbsp;
                            <Link href={shortId ? `https://maayanlab.cloud/Enrichr/enrich?dataset=${shortId}` : "https://maayanlab.cloud/Enrichr/"} 
                                target="_blan"
                                rel="noopener noreferrer"
                                style={{color: "black", textDecoration: "none"}}
                            >
                                <span style={{fontSize: 20, fontWeight: 500, letterSpacing: "0.1em"}}>En</span><span style={{color: "red", fontSize: 20, fontWeight: 500, letterSpacing: "0.1em"}}>rich</span><span style={{fontSize: 20, fontWeight: 500, letterSpacing: "0.1em"}}>r</span>
                            </Link>
                        </Typography>
                    } */}

                <Grid item xs={12} md={3}>
                    <QueryForm 
                        genes={cancer_types[group_name][term]}
                        parsedParams={{term: default_term, group_name: default_group, ...parsedParams}}
                        elements={elements}
                        cancer_types={cancer_types}
                        cell_info = {celltype_info}
                    />
                    <TooltipComponentGroup
                        elements={elements}
                        tooltip_templates_edges={tooltip_templates_edges}
                        tooltip_templates_nodes={tooltip_templates_node}
                        schema={schema}
                        filter_field="q"
                    />
                </Grid>
                <Grid item xs={12} md={9}>
                    <Stack direction={"column"} alignItems={"flex-start"} spacing={1}>
                        <InteractiveButtons 
                            hiddenLinksRelations={hiddenLinksRelations}
                            shortId={shortId}
                            parsedParams={{term: default_term, group_name: default_group, ...parsedParams}}
                            // searchParams={parsedParams}
                            fullscreen={searchParams.fullscreen}
                            elements={elements}
                            short_url={short_url}
                            additional_link_relation_tags={props.additional_link_relation_tags}
                            min_p={min_p}
                            max_p={max_p}
                            min_z={min_z}
                            max_z={max_z}
                        />
                        
                        <Card sx={{borderRadius: "24px", minHeight: 450, width: "100%"}}>
                            <CardContent>
                                {(userListId === undefined || (term === undefined && group_name === undefined)) ?
                                    <Typography variant="subtitle1">Please add a gene set</Typography>:
                                    <> 
                                        {input_desc && 
                                            <Typography variant="h5" sx={{textAlign: "center"}}><b>{input_desc}</b></Typography>
                                        }
                                        <TermViz
                                            elements={elements} 
                                            view={searchParams.view}
                                            /*enrichment_results = {enrichment_results}*/
                                            
                                        />
                                    </>
                                }
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>
        )
    } catch (error) {
        console.error(error)
        return null
    }
}

export default Enrichment