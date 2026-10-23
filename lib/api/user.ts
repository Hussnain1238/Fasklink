import axios from "axios";
export const postdata = async (data: { name: string; email: string; password: string }) => {
            try {
                    const  response  =await  axios.post("/api/test-db", data)
                    return response.data;
            }catch (error){
                    console.error("Error posting data:", error);
                    throw error;
            }
}