import axios from "axios";
import api from "./api";

// Public consent requests never attach the worker's permanent JWT or put the access code in an API URL.
const providerApi = axios.create({ baseURL: api.defaults.baseURL });
export default providerApi;
