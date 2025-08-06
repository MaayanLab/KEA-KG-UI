import React from "react";
import Link from "next/link";
import {
    Grid,
    Stack,
    Typography,
    Card,
    CardContent,
    Box,
    Button
} from "@mui/material";
import GeneSetForm from "./form";
import TermViz from "./TermViz";
import { NetworkSchema } from "@/app/api/knowledge_graph/route";
import { parseAsJson } from "next-usequerystate";
import InteractiveButtons from "./InteractiveButtons";
import { fetch_kg_schema } from "@/utils/initialize";
import TooltipComponentGroup from "../TermAndGeneSearch/tooltip";
import { get_element } from "./element_resolver";
import OpenInNewIcon from '@mui/icons-material/OpenInNew'


export interface EnrichmentParams {
    libraries?: Array<{
        name?: string,
        limit?: number,
        library?: string,
        term_limit?: number, 
    }>,
    userListId?: string,
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
    term?: string,
    group_name?: string,
}


const Enrichment = async ({
    libraries: l,
    sortLibraries,
    searchParams,
    endpoint,
    ...props
}: {
    default_options?: {
        // term_limit?: number,
        gene_limit?: number,
        min_lib?: number,
        gene_degree?: number,
        term_degree?: number,
        libraries: Array<{
            library?: string,
            term_limit?: number
        }>,
    },
    example?: {
        gene_set?: string,
        description?:string
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
    additional_link_relation_tags?: Array<string>

}) => {
    const query_parser = parseAsJson<EnrichmentParams>().withDefault(props.default_options)
    console.log("Getting schema...")
    const schema = await fetch_kg_schema()
    console.log("Schema fetched")
    const libraries_list = sortLibraries ? l.sort(function(a, b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
     }): l


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
        let shortId = ""
        let min_p = 1
        let max_p = 0
        let min_z = 100
        let max_z = 0
        let input_desc
        let elements: NetworkSchema = null
        // console.log("to remove", typeof parsedParams.remove[0])
        const userListId = parsedParams.userListId
        if (userListId !==undefined) {
            console.log("Getting description...")
            const desc_request = await fetch(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ""}/api/enrichment/view?userListId=${userListId}`)
            if (desc_request.ok) input_desc = (await (desc_request.json())).desc
            console.log("Getting shortID...")
            console.log(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ""}/api/enrichment/view?userListId=${userListId}`)
            //const request = await fetch(`${process.env.NEXT_PUBLIC_ENRICHR_URL}/share?userListId=${userListId}`)
            //if (request.ok) shortId = (await (request.json())).link_id
            //else console.log(`${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ""}/api/enrichment/view?userListId=${userListId}`)
            shortId = userListId
            console.log(`Enrichment ${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: ""}/api/enrichment${parsedParams.augment===true ? "/augment": ""}`)
            const parsed = await get_element(parsedParams)
            elements = parsed.elements
            min_z = parsed.min_z
            max_z = parsed.max_z
        }
        const payload = {
            "url": `${process.env.NEXT_PUBLIC_HOST}${process.env.NEXT_PUBLIC_PREFIX ? process.env.NEXT_PUBLIC_PREFIX: "/"}${endpoint}${searchParams.q ? '?q=' + searchParams.q: ''}`,
            "apikey": process.env.TURL  
        }
        console.log(payload)
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
            <Grid container spacing={1} alignItems={"flex-start"}>
                <Grid item xs={12}>
                    <Typography variant={"h2"}>{props.title || "Enrichment Analysis"}</Typography>
                </Grid>
                <Grid item xs={12} md={elements===null?12:3}>
                    <Card elevation={0} sx={{borderRadius: "8px", backgroundColor: (!schema.ui_theme || schema.ui_theme === "cfde_theme" || elements !== null) ? "tertiary.light": "#FFF"}}>
                        <CardContent>
                            <GeneSetForm 
                                parsedParams={parsedParams}
                                fullWidth={elements===null}
                                elements={elements}
                                {...props}
                            /> 
                            <TooltipComponentGroup
                                elements={elements}
                                tooltip_templates_edges={tooltip_templates_edges}
                                tooltip_templates_nodes={tooltip_templates_node}
                                schema={schema}
                                filter_field="q"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                
                { elements!==null && 
                    <Grid item xs={12} md={9}>
                        <Stack direction={"column"} alignItems={"flex-start"} spacing={1}>
                            <InteractiveButtons 
                                hiddenLinksRelations={hiddenLinksRelations}
                                shortId={shortId}
                                parsedParams={parsedParams}
                                // searchParams={parsedParams}
                                fullscreen={searchParams.fullscreen}
                                view={searchParams.view}
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
                                    {input_desc ? 
                                        <Typography variant="h5" sx={{textAlign: "center"}}><b>Enriched Kinase-Phosphosite Subnetwork for {input_desc}</b></Typography>:
                                        <Typography variant="h5" sx={{textAlign: "center"}}><b>Enriched Kinase-Phosphosite Subnetwork for Input Phosphosite Set</b></Typography>
                                    }
                                    <TermViz
                                        elements={elements}
                                        view={searchParams.view}
                                        /*enrichment_results = {enrichment_results}*/
                                    />
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>
                }
            </Grid>
        )
    } catch (error) {
        console.error(error)
        return null
    }
}

export default Enrichment