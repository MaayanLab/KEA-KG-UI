import { neo4jDriver } from "@/utils/neo4j"
import neo4j from "neo4j-driver"
import { NextResponse } from "next/server"
import type { NextRequest } from 'next/server' 
import { z } from 'zod'

export const verify_input = async (input:Array<string>, convert:Boolean) => {
	try{
		const session = neo4jDriver.session({
			defaultAccessMode: neo4j.session.READ
		})
		try {
			const query = `MATCH (n:kinase_phosphosite)
				WHERE n.label IN ${JSON.stringify(input)}
				RETURN n
			`
			
			const rs = await session.readTransaction(txc => txc.run(query))
			const valid = []
			rs.records.flatMap(record => {
				const node = record.get('n')
				const {label} = node.properties
				// let l:string 
				// if (convert) l = label
				// else l = input.indexOf(label) > -1 ? label: input.indexOf(HGNC) > -1 ? HGNC : input.indexOf(Ensembl) > -1 ? Ensembl: null
				if (label && valid.indexOf(label) === -1) valid.push(label)
			})
			return valid
				
		} catch (error) {
			throw error
		} finally {
			session.close()
		}
		
	} catch (error) {
		throw error
	}
}
