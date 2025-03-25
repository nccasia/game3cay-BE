export interface IOReturn {
    status: Status // 0: success, 1: fail, 2: warning
    data:
        {
            user: string,
            balance: number
        }
    message: string;
}

export enum Status {
    Success = 0,
    Fail = 1,
    Warning = 2
}